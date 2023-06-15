#!.venv/bin/python

import os
import sqlite3

from flask import Flask, request, send_from_directory, jsonify, render_template, redirect
from PIL import Image

from vqa import ask_question

app = Flask(__name__)
conn = sqlite3.connect("names.db", check_same_thread=False)
cursor = conn.cursor()

def insert_new_person(id, name):
    cursor.execute(f"insert into persons values ({id}, '{name}')")
    conn.commit()

def delete_person(id):
    cursor.execute(f"delete from persons where id={id}")
    conn.commit()

def get_name(id):
    response = cursor.execute(f"select name from persons where id={id}")
    response = response.fetchone()

    if len(response) == 0:
        return ""
    else:
        return response[0]

delete_person(1)

@app.route("/name/<id>", methods=('GET',))
def name_route(id):
    if id != None:
        return jsonify({
            "name": get_name(id)
        })
    else:
        return "You forgot the id !"

# Images
@app.route("/images/", methods=("GET", "POST"))
@app.route("/images/<id>", methods=("GET", "DELETE"))
def images_route(id=None):
    if request.method == "GET":
        # List one or more images
        if id != None:
            path = f"{id}.jpg"
            return send_from_directory(os.path.join(os.getcwd(), "uploads/images/"), path)
        else:
            return os.listdir(os.path.join(os.getcwd(), 'uploads/images/'))

    elif request.method == "POST":
        # Add image
        if "file" not in request.files:
            return "No file part in the request."

        file = request.files["file"]
        
        if file.filename == "":
            return "No file selected !"
    
        persons_name = request.form["name"]

        if  persons_name == "":
            return "No person's name !"
        
        if len(os.listdir(os.path.join(os.getcwd(), "uploads/images/"))) == 0:
            new_n = "1"
        else:
            last_n = sorted(os.listdir(os.path.join(os.getcwd(), "uploads/images/")))[-1].split(".")[0]
            new_n = str(int(last_n) + 1)

        image_path = os.path.join(os.getcwd(), f"uploads/images/{file.filename}")
        file.save(image_path)
        image = Image.open(image_path)
        image = image.convert("RGB", palette=Image.Palette.WEB)
        image.save(os.path.join(os.getcwd(), f"uploads/images/{new_n}.jpg"))
        os.remove(image_path)

        insert_new_person(new_n, persons_name)

        return redirect("/admin")

    elif request.method == "DELETE":
        # Delete image
        if id != None:
            try:
                os.remove(os.path.join(os.getcwd(), f"uploads/images/{id}.jpg"))
                delete_person(id)
                return "OK"
            except OSError as e:
                print(e)
        else:
            return "You forgot to specify an ID !"
        
@app.route("/admin", methods=("GET",))
def admin_route():
    images = sorted(os.listdir(os.path.join(os.getcwd(), "uploads/images/")))
    persons = []

    for image in images:
        persons.append({
            "id": image.split(".")[0],
            "name": get_name(image.split(".")[0])
        })

    return render_template("admin.html", persons=persons)

@app.route('/vqa/<id>', methods=('POST',))
def vqa_route(id=None):
    image_path = os.path.join(os.getcwd(), f"uploads/images/{id}.jpg")
    question = request.get_json()["question"]
    answer = ask_question(image_path, question)

    print(jsonify({ "answer": answer }))

    return jsonify({ "answer": answer })

@app.route("/")
def index():
    return render_template('index.html')

if __name__ == "__main__":
    app.run(port=8080)